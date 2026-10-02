import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU - mutant detection test for stateVariable replacement", function () {
  it("should detect mutant where 'from' is changed to address(this) instead of hardcoded address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed as state variables are initialized in declaration)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // Check the 'from' state variable - in original it should be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // In mutant it would be address(this) which is the contract's own address
    const fromAddress = await instance.from();
    
    // Verify that 'from' is NOT the contract's address (which would indicate the mutant)
    expect(fromAddress).to.not.equal(contractAddress);
    
    // Verify that 'from' equals the original hardcoded address
    const expectedFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    expect(fromAddress).to.equal(expectedFrom);
    
    // Also verify that caddress is set correctly
    const caddress = await instance.caddress();
    const expectedCaddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";
    expect(caddress).to.equal(expectedCaddress);
  });
});