import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection test", function () {
  it("should kill mutant m454a07f5 by verifying the from address used in transferFrom call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract's own address
    const contractAddress = await instance.getAddress();
    
    // Get the original hardcoded from address
    const originalFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Deploy a simple mock contract to track the transferFrom call
    const MockFactory = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockFactory.deploy();
    await mockToken.waitForDeployment();
    
    // Set the caddress in EBU to point to our mock token
    // Note: caddress is a public state variable, so we need to interact with it
    // Since there's no setter, we'll deploy a new EBU with the mock address
    // Actually, let's use a different approach - we'll check the revert behavior
    
    // Impersonate the original hardcoded address
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [originalFromAddress],
    });
    const impersonatedSigner = await ethers.getSigner(originalFromAddress);
    
    // Fund the impersonated account
    await owner.sendTransaction({
      to: originalFromAddress,
      value: ethers.parseEther("1.0"),
    });
    
    // Prepare test data
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")];
    
    // Call transfer - this should succeed in the original but fail in the mutant
    // because in the mutant, msg.sender != address(this) for an external caller
    const tx = await instance.connect(impersonatedSigner).transfer(tos, values);
    await tx.wait();
    
    // If we reach here, the transaction succeeded
    // In the original, this works because msg.sender == from (0x9797...)
    // In the mutant, this would revert because msg.sender != address(this)
    expect(true).to.be.true;
  });
});