import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - m4c5bd6a9", function () {
    it("should allow transfer to a non-zero address (original behavior), but mutant reverts", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const initialSupply = 1000;
        const tokenName = "TestToken";
        const tokenSymbol = "TT";

        const Factory = await ethers.getContractFactory("ERCDDAToken");
        const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
        await instance.waitForDeployment();

        // Transfer some tokens from owner to addr1 (non-zero address)
        const transferAmount = 100;
        const tx = instance.transfer(addr1.address, transferAmount);

        // The original contract should succeed; the mutant will revert because it requires _to == address(0)
        await expect(tx).to.not.be.reverted;
    });
});