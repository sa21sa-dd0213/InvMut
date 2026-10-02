import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m4f9309f1", function () {
    it("should successfully collect funds after meeting all conditions, but mutant blocks it", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for W_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const WalletFactory = await ethers.getContractFactory("W_WALLET");
        const wallet = await WalletFactory.deploy(await log.getAddress());
        await wallet.waitForDeployment();
        
        const walletAddress = await wallet.getAddress();
        
        // User deposits 2 ether with unlock time in the past (block.timestamp)
        const depositAmount = ethers.parseEther("2");
        const currentBlock = await ethers.provider.getBlock("latest");
        const pastTimestamp = currentBlock.timestamp - 100; // Already unlocked
        
        await wallet.connect(user).Put(pastTimestamp, { value: depositAmount });
        
        // Verify initial balance
        const holderBefore = await wallet.Acc(user.address);
        expect(holderBefore.balance).to.equal(depositAmount);
        
        // Try to collect 1 ether - should succeed in original, fail in mutant
        const collectAmount = ethers.parseEther("1");
        
        // In the original: conditions are met (balance >= MinSum(1 ether), balance >= _am, timestamp > unlockTime)
        // In the mutant: condition is always false, so collect will do nothing
        const tx = await wallet.connect(user).Collect(collectAmount);
        const receipt = await tx.wait();
        
        // Check balance after collect
        const holderAfter = await wallet.Acc(user.address);
        
        // In original: balance should be reduced by collectAmount (2 - 1 = 1 ether)
        // In mutant: balance should remain unchanged (2 ether) because condition is always false
        expect(holderAfter.balance).to.equal(ethers.parseEther("1"));
        
        // Verify event was logged in Log contract
        const historyLength = await log.HistoryLength();
        // Should have at least 2 entries: one for Put, one for Collect
        expect(historyLength).to.be.gte(2);
    });
});