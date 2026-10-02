import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant m427c3738 - kill with early withdrawal before unlock", function () {
    it("should revert when trying to collect before unlock time in original, but mutant allows it", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Log contract first (required by MY_BANK constructor)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy MY_BANK with Log address
        const Factory = await ethers.getContractFactory("MY_BANK");
        const instance = await Factory.deploy(await log.getAddress());
        await instance.waitForDeployment();
        
        // Set MinSum to 1 ether (default)
        const minSum = ethers.parseEther("1");
        
        // addr1 deposits 2 ether with unlock time far in the future
        const futureTime = Math.floor(Date.now() / 1000) + 100000; // ~28 hours from now
        const depositAmount = ethers.parseEther("2");
        await instance.connect(addr1).Put(futureTime, { value: depositAmount });
        
        // Verify balance is set
        const acc = await instance.Acc(addr1.address);
        expect(acc.balance).to.equal(depositAmount);
        
        // Try to collect 1 ether immediately (before unlock time)
        const collectAmount = ethers.parseEther("1");
        
        // In original: should revert because block.timestamp <= unlockTime
        // In mutant: will succeed because balance >= MinSum && balance >= _am makes the || true
        await expect(
            instance.connect(addr1).Collect(collectAmount)
        ).to.be.reverted;
    });
});