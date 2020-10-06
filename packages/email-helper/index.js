const nodemailer = require('nodemailer')
var { getOptionValue } = require('../../helpers')

class EH {
  sendMail = async (to, subject, message = '') => {
    try {
      var SMTP_HOST = await getOptionValue('SMTP_HOST')
      var SMTP_PORT = await getOptionValue('SMTP_PORT')
      var SMTP_SECURE = await getOptionValue('SMTP_SECURE')
      var SMTP_AUTH_USERNAME = await getOptionValue('SMTP_AUTH_USERNAME')
      var SMTP_AUTH_PASSWORD = await getOptionValue('SMTP_AUTH_PASSWORD')
      var SMTP_FROM_NAME = await getOptionValue('SMTP_FROM_NAME')
      var SMTP_FROM_EMAIL = await getOptionValue('SMTP_FROM_EMAIL')
      var SMTP_REPLYTO_EMAIL = await getOptionValue('SMTP_REPLYTO_EMAIL')

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_AUTH_USERNAME) {
        throw new Error(
          `Email settings incomplete, the message did not send to ${to}`
        )
      }

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_AUTH_USERNAME,
          pass: SMTP_AUTH_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      })

      const mailOptions = {
        from: SMTP_FROM_NAME + ' ' + '<' + SMTP_FROM_EMAIL + '>',
        to: to,
        replyTo: SMTP_REPLYTO_EMAIL,
        subject: subject,
        html: message,
      }

      const info = await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, results) => {
          if (error) {
            reject(error)
          }

          resolve(results)
        })
      })

      return info
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  sendRegistrationEmail = async (to, link, req) => {
    try {
      const dir = req.i18n.dir()

      const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME')

      const subject = req.t('emailConfirmation')

      const message = `
          <p dir="${dir}">${req.t('Hi')}</p>
          <p dir="${dir}">${req.t('thanksForReg', {
        appName: BUSINESS_NAME,
      })}</p>
          <p dir="${dir}">${req.t('clickOnLink')}</p>
          <p><a href="${link}">${link}</a></p>
          <p dir="${dir}">${req.t('ifNotWork')}</p>
          <p dir="${dir}">${req.t('KindRegards')}</p>
          <p dir="${dir}">${BUSINESS_NAME}</p>
          `

      const info = await this.sendMail(to, subject, message)

      return info
    } catch (error) {
      console.error(error)
    }
  }

  resendConfirmationEmail = async (to, link, req) => {
    const dir = req.i18n.dir()

    const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME')

    const subject = req.t('emailConfirmation')

    const message = `
                    <p dir="${dir}">${req.t('Hi')}</p>
                    <p dir="${dir}">${req.t('receivedBecauseResendReq')}</p>
                    <p dir="${dir}">${req.t('clickOnLink')}</p>
                    <p><a href="${link}">${link}</a></p>
                    <p dir="${dir}">${req.t('ifNotWork')}</p>
                    <p dir="${dir}">${req.t('KindRegards')}</p>
                    <p dir="${dir}">${BUSINESS_NAME}</p>
                        `

    const info = await this.sendMail(to, subject, message)

    return info
  }

  newEmailConfirmation = async (to, link, req) => {
    try {
      const dir = req.i18n.dir()

      const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME')

      const subject = req.t('emailConfirmation')

      const message = `
              <p dir="${dir}">${req.t('Hi')}</p>
              <p dir="${dir}">${req.t('receivedBecauseChangeEmailReq')}</p>
              <p dir="${dir}">${req.t('clickOnLink')}</p>
              <p><a href="${link}">${link}</a></p>
              <p dir="${dir}">${req.t('ifNotWork')}</p>
              <div dir="${dir}">
              <div>${req.t('ifNotYou')}</div>
              </div>
              <p dir="${dir}">${req.t('KindRegards')}</p>
              <p dir="${dir}">${BUSINESS_NAME}</p>
                                  `
      const info = await this.sendMail(to, subject, message)

      return info
    } catch (error) {
      console.error(error)
    }
  }

  sendForgotPasswordEmail = async (to, link, req) => {
    const dir = req.i18n.dir()

    const BUSINESS_NAME = await getOptionValue('BUSINESS_NAME')

    const subject = req.t('resetPassword')

    const message = `
          <p dir="${dir}">${req.t('Hi')}</p>
          <p dir="${dir}">${req.t('resetPassReq')}</p>
          <p dir="${dir}">${req.t('toChangePassword')}</p>
          <p><a href="${link}">${link}</a></p>
          <p dir="${dir}">${req.t('ifNotReqResPass')}</p>
          <p dir="${dir}">${req.t('KindRegards')}</p>
          <p dir="${dir}">${BUSINESS_NAME}</p>
          `
    const info = await this.sendMail(to, subject, message)

    return info
  }
}

var EmailHelper = new EH()

module.exports = { EmailHelper }
