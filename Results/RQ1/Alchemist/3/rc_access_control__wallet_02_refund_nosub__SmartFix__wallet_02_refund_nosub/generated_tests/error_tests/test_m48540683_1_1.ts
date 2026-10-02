import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - migrateTo access control", function () {
    it("should revert when non-creator calls migrateTo", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("Wallet");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Fund the contract so there's balance to migrate
        await owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("1.0")
        });

        // Attempt to call migrateTo from a non-creator address - should revert in original
        await expect(
            instance.connect(addr1).migrateTo(addr2.address)
        ).to.be.reverted;
    });
});