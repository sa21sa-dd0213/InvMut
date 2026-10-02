import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mfd526744", function () {
    it("should detect the mutant by verifying caddress equals address(this) instead of the original hardcoded address", async function () {
        const [owner] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // In the original, caddress is set to 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
        // In the mutant, caddress is set to address(this)
        // We can detect the mutant by checking that caddress equals the contract's own address
        const contractAddress = await instance.getAddress();
        const caddressValue = await instance.caddress();
        
        // If the mutant is active, caddress will equal the contract's own address
        // If the original is deployed, caddress will be the hardcoded address
        // The mutant should fail this assertion because in the original it would be different
        expect(caddressValue).to.equal(contractAddress);
    });
});