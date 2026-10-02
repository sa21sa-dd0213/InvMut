import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - m0f3138c5", function () {
    it("should kill the mutant by detecting timestamp vs prevrandao mismatch in unlockTime assignment", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy MONEY_BOX (no constructor arguments needed)
        const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
        const moneyBox = await MoneyBoxFactory.deploy();
        await moneyBox.waitForDeployment();
        
        // Deploy Log contract (needed for AddMessage calls)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Initialize the contract with LogFile and MinSum
        await moneyBox.connect(owner).SetLogFile(await log.getAddress());
        await moneyBox.connect(owner).SetMinSum(ethers.parseEther("0.01"));
        await moneyBox.connect(owner).Initialized();
        
        // Get current block timestamp
        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        const currentTimestamp = blockBefore!.timestamp;
        
        // addr1 puts 1 ETH with 0 lock time
        const putAmount = ethers.parseEther("1");
        const txPut = await moneyBox.connect(addr1).Put(0, { value: putAmount });
        await txPut.wait();
        
        // Check the unlock time set by the contract
        const holder = await moneyBox.Acc(addr1.address);
        const unlockTime = holder.unlockTime;
        
        // In original: unlockTime = block.timestamp + 0 = currentTimestamp
        // In mutant: unlockTime = block.prevrandao + 0 = block.prevrandao
        // block.prevrandao is typically a large number, not equal to currentTimestamp
        
        // Attempt Collect - should succeed in original, revert in mutant
        // because mutant sets unlockTime to prevrandao which is >> currentTimestamp
        const collectAmount = ethers.parseEther("0.5");
        
        // The collect should revert if mutant is active because 
        // block.timestamp (current time) < block.prevrandao (unlockTime)
        await expect(
            moneyBox.connect(addr1).Collect(collectAmount)
        ).to.be.reverted;
        
        // Verify the test passed (mutant killed)
        // In original, this would NOT revert, but in mutant it does
    });
});