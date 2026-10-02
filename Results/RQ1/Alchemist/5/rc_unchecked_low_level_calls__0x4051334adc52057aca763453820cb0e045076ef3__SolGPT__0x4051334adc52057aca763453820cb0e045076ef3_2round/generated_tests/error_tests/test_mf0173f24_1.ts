import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should revert when _tos array is empty (original behavior)", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("airdrop");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Test: calling transfer with empty _tos array should revert in original, pass in mutant
        await expect(
            instance.transfer(
                owner.address,
                addr1.address,
                [], // empty _tos array
                100
            )
        ).to.be.reverted;
    });
});