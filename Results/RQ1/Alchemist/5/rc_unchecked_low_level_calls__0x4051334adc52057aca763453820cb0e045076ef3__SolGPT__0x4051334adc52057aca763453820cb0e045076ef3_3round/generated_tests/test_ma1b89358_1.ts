import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant test - ma1b89358", function () {
  it("should revert when external token transfer fails (mutant removed require)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that returns false on transferFrom
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the airdrop contract (no constructor args)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Prepare test: owner has no tokens to transfer from addr1
    const recipients = [addr2.address];
    const value = ethers.parseEther("1");
    
    // This call should revert because addr1 has no allowance and no tokens
    // The original require(_s) would catch the failure, mutant would not
    await expect(
      airdrop.transfer(owner.address, await token.getAddress(), recipients, value)
    ).to.be.reverted;
  });
});

// Simple ERC20 that returns false from transferFrom for testing
contract SimpleERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function transferFrom(address, address, uint256) public pure returns (bool) {
        return false;
    }
}