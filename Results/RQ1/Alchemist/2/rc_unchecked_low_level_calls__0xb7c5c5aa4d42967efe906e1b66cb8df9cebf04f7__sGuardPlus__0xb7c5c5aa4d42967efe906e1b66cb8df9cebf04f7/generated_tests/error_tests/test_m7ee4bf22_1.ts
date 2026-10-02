import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant detection", function () {
    it("should detect m7ee4bf22: fallback uses msg.value-1 instead of msg.value", async function () {
        const [owner, user] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("keepMyEther");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Send exactly 1 wei to the contract via fallback
        const sendAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
        const tx = await user.sendTransaction({
            to: await instance.getAddress(),
            value: sendAmount
        });
        await tx.wait();

        // Check balance recorded in the contract
        const userBalance = await instance.balances(user.address);
        
        // On the original, balance should be 1 wei
        // On the mutant, balance would be 0 (since msg.value-1 = 0)
        // We expect balance to be exactly sendAmount
        expect(userBalance).to.equal(sendAmount);
        
        // Now attempt withdrawal - on mutant this would send 0 wei which may revert
        // or fail to return the expected amount
        const withdrawTx = instance.connect(user).withdraw();
        await expect(withdrawTx).to.changeEtherBalance(user, sendAmount);
    });
});