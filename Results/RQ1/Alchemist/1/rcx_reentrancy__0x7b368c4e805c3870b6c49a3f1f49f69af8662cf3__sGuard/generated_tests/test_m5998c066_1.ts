import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant m5998c066 test", function () {
    it("should kill the mutant by verifying that Collect fails when block.prevrandao is used instead of block.timestamp", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy the Log contract first (required constructor argument)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const WalletFactory = await ethers.getContractFactory("W_WALLET");
        const wallet = await WalletFactory.deploy(await log.getAddress());
        await wallet.waitForDeployment();
        
        // User puts 2 ether with unlock time far in the future (block.timestamp + 1000)
        const futureTime = (await ethers.provider.getBlock("latest")).timestamp + 1000;
        await wallet.connect(user).Put(futureTime, { value: ethers.parseEther("2") });
        
        // Verify balance was recorded
        const holder = await wallet.Acc(user.address);
        expect(holder.balance).to.equal(ethers.parseEther("2"));
        expect(holder.unlockTime).to.equal(futureTime);
        
        // Now mine blocks until current time exceeds unlockTime
        await ethers.provider.send("evm_increaseTime", [1001]);
        await ethers.provider.send("evm_mine", []);
        
        // Verify current block.timestamp is now > unlockTime
        const currentBlock = await ethers.provider.getBlock("latest");
        expect(currentBlock.timestamp).to.be.greaterThan(futureTime);
        
        // Attempt Collect - this should fail on the mutant because block.prevrandao
        // is not guaranteed to be > unlockTime, even though block.timestamp is.
        // On the original, this would succeed.
        await expect(
            wallet.connect(user).Collect(ethers.parseEther("1"))
        ).to.be.reverted; // Mutant will revert because block.prevrandao < unlockTime
        
        // Additional verification: balance should remain unchanged on mutant
        const holderAfter = await wallet.Acc(user.address);
        expect(holderAfter.balance).to.equal(ethers.parseEther("2"));
    });
});