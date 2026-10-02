import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
    it("should allow transfer of 0 tokens (mutant kills this)", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const initialSupply = 1000;
        const tokenName = "TestToken";
        const tokenSymbol = "TT";
        const Factory = await ethers.getContractFactory("ERCDDAToken");
        const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
        await instance.waitForDeployment();

        // Transfer 0 tokens from owner to addr1 should succeed in original
        await expect(
            instance.transfer(addr1.address, 0)
        ).to.not.be.reverted;
    });
});