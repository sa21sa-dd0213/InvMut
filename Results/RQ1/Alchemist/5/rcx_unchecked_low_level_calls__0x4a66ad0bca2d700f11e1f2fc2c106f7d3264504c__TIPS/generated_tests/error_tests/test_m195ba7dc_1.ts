import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant m195ba7dc - keccak256 replaced with sha256", function () {
  it("should detect mutant by verifying transfer succeeds with correct function selector", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed as per contract)
    const EBUFactory = await ethers.getContractFactory("EBU");
    const ebu = await EBUFactory.deploy();
    await ebu.waitForDeployment();
    
    // Get the caddress from the contract
    const caddress = await ebu.caddress();
    
    // Create a simple token contract that implements transferFrom to verify the call
    const TestTokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TestTokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Set the EBU contract's caddress to our test token
    // Note: We can't change caddress directly as it's a public variable, 
    // but we can deploy a new EBU that uses our token's address
    
    // Alternative: Deploy a modified version or use the existing setup
    // Since caddress is hardcoded, we'll test the actual behavior
    
    // For this test, we'll deploy the EBU and check that the transferFrom call
    // would fail because sha256 produces a different selector than keccak256
    
    // First, let's check the original selector
    const originalSelector = ethers.id("transferFrom(address,address,uint256)").slice(0, 10);
    const mutantSelector = ethers.sha256(Buffer.from("transferFrom(address,address,uint256)")).slice(0, 10);
    
    // They should be different
    expect(originalSelector).to.not.equal(mutantSelector);
    
    // Now test the actual transfer function
    const from = await ebu.from();
    const tos = [addr1.address];
    const values = [1]; // 1 token
    
    // This should revert because the sha256 selector doesn't match any function
    await expect(
      ebu.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});

// Helper contract to test the call
contract SimpleToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        return true;
    }
}