import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airdrop mutant mab727b40 test", function () {
    it("should revert when calling transfer with empty _tos array (mutant uses < instead of >)", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("airdrop");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
        // With an empty array, length = 0, original passes (0 > 0 is false -> revert)
        // Mutant: 0 < 0 is false -> also reverts - so empty array kills both
        // But to specifically kill the mutant, we need a non-empty array where:
        // Original: 1 > 0 = true (passes)
        // Mutant: 1 < 0 = false (reverts)
        const tokenAddress = "0x0000000000000000000000000000000000000001"; // dummy token address
        const recipients = [addr1.address]; // non-empty array with 1 element
        const amount = ethers.parseEther("1");

        // This should pass on original (1 > 0) but revert on mutant (1 < 0)
        await expect(
            instance.connect(owner).transfer(
                owner.address,
                tokenAddress,
                recipients,
                amount
            )
        ).to.be.reverted;
    });
});