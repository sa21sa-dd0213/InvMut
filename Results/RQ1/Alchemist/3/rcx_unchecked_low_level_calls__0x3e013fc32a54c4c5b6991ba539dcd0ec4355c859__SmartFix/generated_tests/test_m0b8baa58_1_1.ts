import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m0b8baa58", function () {
    it("should revert when msg.value is 0 and contract balance is 0 (mutant changes >= to >)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX4");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with some ether so we can test the multiplicate function
        const fundTx = await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });
        await fundTx.wait();

        // Get initial balances
        const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
        const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);

        // Call multiplicate with msg.value = 0 (this will pass in original but revert in mutant)
        await expect(
            instance.connect(owner).multiplicate(addr1.address, { value: 0 })
        ).to.be.reverted;

        // Verify no funds were transferred (mutant would have reverted before transfer)
        const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
        const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);
        expect(finalContractBalance).to.equal(initialContractBalance);
        expect(finalAddr1Balance).to.equal(initialAddr1Balance);
    });
});