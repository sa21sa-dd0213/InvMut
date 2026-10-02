import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant mec62b79e test", function () {
    it("should detect mutant by allowing collect before unlock time due to block.prevrandao usage", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy Log contract first (needed as constructor argument)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy X_WALLET with Log address
        const Factory = await ethers.getContractFactory("X_WALLET");
        const instance = await Factory.deploy(await log.getAddress());
        await instance.waitForDeployment();
        
        // Set minimum sum to 0 to simplify test (optional, but 1 ether is large)
        // We'll work with default MinSum = 1 ether
        
        // addr1 sends exactly 1 ether with unlockTime = current block.timestamp + 100
        const depositAmount = ethers.parseEther("1");
        const futureTime = (await ethers.provider.getBlock("latest")).timestamp + 100;
        
        await instance.connect(addr1).Put(futureTime, { value: depositAmount });
        
        // Now try to collect immediately (before unlockTime in original)
        // In original, this should revert because block.timestamp < unlockTime
        // In mutant, block.prevrandao may be less than futureTime, allowing collect
        const collectAmount = ethers.parseEther("1");
        
        // We expect the transaction to succeed on mutant (fail to revert)
        // But on original it would revert - this difference kills the mutant
        const tx = instance.connect(addr1).Collect(collectAmount);
        
        // If mutant is deployed, this will succeed (no revert)
        // If original is deployed, this will revert
        // We assert it succeeds to detect the mutant
        await expect(tx).to.not.be.reverted;
        
        // Additional check: balance should be reduced after successful collect
        const holder = await instance.Acc(addr1.address);
        expect(holder.balance).to.equal(0);
    });
});