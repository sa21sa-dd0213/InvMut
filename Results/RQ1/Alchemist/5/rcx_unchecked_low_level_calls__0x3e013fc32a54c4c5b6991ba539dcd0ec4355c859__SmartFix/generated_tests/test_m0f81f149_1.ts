import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test - Command access control", function () {
    it("should revert when non-owner calls Command without the require statement", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX4");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract with some ether first so balance checks work
        const fundTx = await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });
        await fundTx.wait();

        // addr1 attempts to call Command - should revert in original, succeed in mutant
        const data = "0x";
        await expect(
            instance.connect(addr1).Command(addr1.address, data, { value: ethers.parseEther("0.5") })
        ).to.be.reverted;
    });
});