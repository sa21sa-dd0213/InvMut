import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant mdc0823e5 detection", function () {
    it("should revert when owner calls onlyOwner function due to mutant", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("SimpleWallet");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract so withdrawAll has balance to work with
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });

        // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
        // So when owner calls withdrawAll, it should revert because owner != owner is false
        await expect(
            instance.connect(owner).withdrawAll()
        ).to.be.reverted;
    });
});