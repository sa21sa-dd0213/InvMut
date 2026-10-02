import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection test", function () {
    it("should revert on Collect when Put was called with a past unlockTime (original behavior)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for MY_BANK)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy MY_BANK with Log address
        const BankFactory = await ethers.getContractFactory("MY_BANK");
        const bank = await BankFactory.deploy(await log.getAddress());
        await bank.waitForDeployment();
        
        const bankAddress = await bank.getAddress();
        const depositAmount = ethers.parseEther("2");
        const pastTime = 0; // A timestamp in the past
        
        // First, ensure we have enough ether for the test
        // Put with a past unlockTime
        await bank.connect(addr1).Put(pastTime, { value: depositAmount });
        
        // Verify the balance was added
        const holderInfo = await bank.Acc(addr1.address);
        expect(holderInfo.balance).to.equal(depositAmount);
        
        // Try to collect - this should revert because unlockTime was set to block.timestamp
        // (original behavior: past unlockTime gets set to current time, not the past)
        // The mutant would set it to 0 (the past) and allow withdrawal
        await expect(
            bank.connect(addr1).Collect(depositAmount)
        ).to.be.reverted;
    });
});