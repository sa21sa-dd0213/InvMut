import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m4e7a8403 test", function () {
    it("should revert when Collect is called exactly at unlockTime (original requires >, mutant uses >=)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy the Log contract first (required constructor argument for MY_BANK)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy MY_BANK with the Log contract address
        const BankFactory = await ethers.getContractFactory("MY_BANK");
        const bank = await BankFactory.deploy(await log.getAddress());
        await bank.waitForDeployment();
        
        // Get current block timestamp
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const currentTimestamp = blockBefore!.timestamp;
        
        // Send exactly 1 ether (MinSum) to the bank via Put with unlockTime = currentTimestamp
        const putTx = await bank.connect(addr1).Put(currentTimestamp, { value: ethers.parseEther("1") });
        await putTx.wait();
        
        // Now try to Collect exactly at the unlockTime (currentTimestamp)
        // Original requires block.timestamp > unlockTime, so this should revert
        await expect(
            bank.connect(addr1).Collect(ethers.parseEther("1"))
        ).to.be.reverted;
        
        // Note: On the mutant with >=, this would NOT revert, thus killing the mutant
    });
});