import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - mac862e55", function () {
  it("should detect mutant by verifying the from address used in transferFrom call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the original from address from the contract
    const originalFrom = await instance.from();
    
    // Create a mock contract to capture the transferFrom call parameters
    const mockCAddressFactory = await ethers.getContractFactory("MockCAddress");
    const mockCAddress = await mockCAddressFactory.deploy();
    await mockCAddress.waitForDeployment();
    
    // Set the caddress in EBU to our mock contract
    await instance.setCaddress(await mockCAddress.getAddress());
    
    // Prepare test data
    const tos = [addr1.address];
    const values = [1]; // 1 token
    
    // Execute transfer
    const tx = await instance.connect(owner).transfer(tos, values);
    await tx.wait();
    
    // Check that the mock contract received the correct from address
    const capturedFrom = await mockCAddress.lastFrom();
    
    // In original: capturedFrom should be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // In mutant: capturedFrom should be address(0)
    expect(capturedFrom).to.equal(originalFrom);
    
    // Also verify the mock contract was called with correct parameters
    const capturedTo = await mockCAddress.lastTo();
    const capturedValue = await mockCAddress.lastValue();
    
    expect(capturedTo).to.equal(addr1.address);
    expect(capturedValue).to.equal(ethers.parseEther("1"));
  });
});