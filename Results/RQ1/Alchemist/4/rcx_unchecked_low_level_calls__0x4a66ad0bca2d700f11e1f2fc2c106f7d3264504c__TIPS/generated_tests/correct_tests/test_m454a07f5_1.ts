import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m454a07f5", function () {
    it("should detect that from address is contract address instead of hardcoded address", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy the contract (no constructor arguments needed)
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Get the contract address
        const contractAddress = await instance.getAddress();
        
        // Check that the 'from' address is NOT equal to the contract address
        // In the original, from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
        // In the mutant, from = address(this) which is the contract address
        const fromAddress = await instance.from();
        expect(fromAddress).to.not.equal(contractAddress, 
            "Mutant detected: from address should not be the contract address");
    });
    
    it("should verify the from address is the original hardcoded address", async function () {
        const [owner] = await ethers.getSigners();
        
        // Deploy the contract
        const Factory = await ethers.getContractFactory("EBU");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // The expected hardcoded address from the original contract
        const expectedFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
        
        // Check the from address
        const fromAddress = await instance.from();
        expect(fromAddress).to.equal(expectedFromAddress,
            "Mutant detected: from address should be the hardcoded address");
    });
});