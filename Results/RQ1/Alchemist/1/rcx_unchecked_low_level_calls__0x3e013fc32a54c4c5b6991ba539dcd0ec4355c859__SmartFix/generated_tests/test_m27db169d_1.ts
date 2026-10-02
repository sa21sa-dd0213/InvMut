import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test - m27db169d", function () {
    it("should detect the mutant that subtracts 1 wei from msg.value in Command function", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX4");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with some initial balance
        const initialFunding = ethers.parseEther("1");
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: initialFunding
        });

        // Record the target address balance before the call
        const targetBalanceBefore = await ethers.provider.getBalance(addr1.address);

        // Call Command with exactly 1 wei
        const tx = await instance.connect(owner).Command(addr1.address, "0x", { value: 1 });
        await tx.wait();

        // Check the target address balance after the call
        const targetBalanceAfter = await ethers.provider.getBalance(addr1.address);

        // In the original contract, the target should receive exactly 1 wei
        // In the mutant, it receives 0 wei (msg.value - 1 = 0)
        expect(targetBalanceAfter - targetBalanceBefore).to.equal(1);
    });
});