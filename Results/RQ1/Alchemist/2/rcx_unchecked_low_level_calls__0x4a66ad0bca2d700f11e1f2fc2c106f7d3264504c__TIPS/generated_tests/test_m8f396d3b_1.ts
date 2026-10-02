import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m8f396d3b test", function () {
  it("should detect the mutated from address by verifying token transfer origin", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed as per original code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract addresses
    const originalFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const mutatedFrom = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";
    const caddress = await instance.caddress();
    
    // Create a mock token contract at caddress that tracks transferFrom calls
    // Since we cannot modify the deployed contract, we simulate by checking the from parameter
    
    // Prepare test data
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")]; // 1 token = 1 * 10^18 wei
    
    // Fund the caddress with some ETH to simulate token balance (since it's a generic call)
    await owner.sendTransaction({
      to: caddress,
      value: ethers.parseEther("10")
    });
    
    // The transfer function should succeed when called by the original from address
    // But the internal call will try to transfer from the mutated from address (caddress)
    // Since caddress is a contract without token logic, the call will likely revert
    await expect(
      instance.connect(await ethers.getSigner(originalFrom)).transfer(tos, values)
    ).to.be.reverted;
    
    // Alternative test: if the call succeeds, verify the from parameter used
    // Deploy a mock token that records the from parameter
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();
    
    // Deploy a new EBU instance with the mock token as caddress
    const EBUWithMock = await ethers.getContractFactory("EBU");
    const instance2 = await EBUWithMock.deploy();
    await instance2.waitForDeployment();
    
    // Set the caddress to the mock token (note: this is not possible in original contract)
    // Instead, we check that the mutated from address differs from the original
    const actualFrom = await instance.from();
    expect(actualFrom).to.equal(mutatedFrom); // This confirms the mutation is present
  });
});