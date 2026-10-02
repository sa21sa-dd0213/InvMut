import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m77397e75 test", function () {
    it("should revert when called from unauthorized address on original, but not on mutant", async function () {
        const [owner, unauthorized] = await ethers.getSigners();
        
        // Deploy EBU (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        const tos = [unauthorized.address];
        const values = [1];
        
        // Attempt to call transfer from unauthorized address
        // Original would revert due to require(msg.sender == 0x9797...)
        // Mutant would not revert since require is removed
        await expect(
            instance.connect(unauthorized).transfer(tos, values)
        ).to.be.reverted;
    });
});