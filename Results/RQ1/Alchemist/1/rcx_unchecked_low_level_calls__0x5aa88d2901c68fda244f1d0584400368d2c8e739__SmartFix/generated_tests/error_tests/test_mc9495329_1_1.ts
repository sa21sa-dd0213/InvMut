import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant mc9495329", function () {
    it("should detect the subtraction mutant by verifying the correct transfer amount", async function () {
        const [owner, recipient] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with 10 ETH
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("10")
        });

        const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
        const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);

        // Call multiplicate with msg.value = contract balance (10 ETH)
        // In original: transfers balance + msg.value = 20 ETH
        // In mutant: transfers balance - msg.value = 0 ETH
        const tx = await instance.connect(owner).multiplicate(recipient.address, {
            value: contractBalanceBefore
        });
        await tx.wait();

        const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
        const expectedTransfer = contractBalanceBefore + contractBalanceBefore; // 20 ETH

        // Assert recipient received the sum, not the difference
        expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(expectedTransfer);
    });
});