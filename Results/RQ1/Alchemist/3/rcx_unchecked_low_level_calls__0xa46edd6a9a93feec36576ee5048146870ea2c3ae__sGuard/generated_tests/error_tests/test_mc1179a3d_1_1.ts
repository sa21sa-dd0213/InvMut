import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should revert when _tos array is empty (kills mutant that removes require check)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        const emptyAddresses: string[] = [];
        const emptyValues: bigint[] = [];
        const tokenAddress = ethers.ZeroAddress; // dummy token address

        await expect(
            instance.transfer(owner.address, tokenAddress, emptyAddresses, emptyValues)
        ).to.be.reverted;
    });
});