import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m28e886d0 test", function () {
    it("should revert when Put is called with msg.value that would cause overflow, but mutant passes", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("X_WALLET");
        
        // Deploy with a Log contract address (constructor requires address of Log)
        const LogFactory = await ethers.getContractFactory("Log");
        const logInstance = await LogFactory.deploy();
        await logInstance.waitForDeployment();

        const instance = await Factory.deploy(await logInstance.getAddress());
        await instance.waitForDeployment();

        // Get the current balance of addr1 to check overflow behavior
        const initialAccount = await instance.Acc(addr1.address);
        const initialBalance = initialAccount.balance;

        // Calculate a value that when added to current balance will overflow uint256
        // We use max uint256 minus current balance plus 1 to cause overflow
        const overflowValue = ethers.MaxUint256 - initialBalance + 1n;

        // Test the overflow scenario
        await expect(
            instance.connect(addr1).Put(overflowValue, { value: overflowValue })
        ).to.be.reverted; // Both should revert due to arithmetic overflow

        // Now test with a fresh deployment
        const instance2 = await Factory.deploy(await logInstance.getAddress());
        await instance2.waitForDeployment();

        // Call Put with msg.value = 0 (both original and mutant pass)
        await instance2.connect(addr1).Put(0, { value: 0 });

        // Test: call Put with msg.value = 1, then check balance increased by exactly 1
        await instance2.connect(addr1).Put(0, { value: 1 });
        const balanceAfter = await instance2.Acc(addr1.address);
        expect(balanceAfter.balance).to.equal(1);

        // Test that both contracts behave the same for normal operations
        const instance3 = await Factory.deploy(await logInstance.getAddress());
        await instance3.waitForDeployment();

        await instance3.connect(addr1).Put(0, { value: ethers.parseEther("1") });
        const bal = await instance3.Acc(addr1.address);
        expect(bal.balance).to.equal(ethers.parseEther("1"));
    });
});