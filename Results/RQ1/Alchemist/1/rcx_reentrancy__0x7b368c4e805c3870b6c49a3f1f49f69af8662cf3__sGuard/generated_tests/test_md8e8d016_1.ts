import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant detection test", function () {
    it("should detect mutant that adds 1 wei to balance on Put", async function () {
        const [owner, user] = await ethers.getSigners();
        
        // Deploy Log contract first (required constructor argument for W_WALLET)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy W_WALLET with Log address
        const Factory = await ethers.getContractFactory("W_WALLET");
        const instance = await Factory.deploy(log.target);
        await instance.waitForDeployment();
        
        const depositAmount = ethers.parseEther("1.0");
        
        // User deposits exactly 1 ether
        const tx = await instance.connect(user).Put(0, { value: depositAmount });
        await tx.wait();
        
        // Check recorded balance in the contract
        const holder = await instance.Acc(user.address);
        const recordedBalance = holder.balance;
        
        // In the original, recordedBalance should equal depositAmount
        // In the mutant, recordedBalance = depositAmount + 1 wei
        expect(recordedBalance).to.equal(depositAmount);
        
        // Verify that Collect can only withdraw the actual deposited amount
        // If mutant, withdrawing recordedBalance would fail due to insufficient contract balance
        await expect(
            instance.connect(user).Collect(recordedBalance)
        ).to.not.be.reverted;
        
        // Check final contract balance - should be 0 if original, but mutant leaves 1 wei
        const contractBalance = await ethers.provider.getBalance(instance.target);
        expect(contractBalance).to.equal(0);
    });
});