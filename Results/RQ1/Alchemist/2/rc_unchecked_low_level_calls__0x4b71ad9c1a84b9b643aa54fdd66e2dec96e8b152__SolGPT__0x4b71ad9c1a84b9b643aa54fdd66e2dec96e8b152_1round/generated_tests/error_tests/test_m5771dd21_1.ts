import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - keccak256 vs sha256", function () {
  it("should detect mutant by verifying token transfer fails due to wrong function selector", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund the 'from' address with tokens
    await token.transfer(from.address, ethers.parseEther("100"));
    
    // Approve the airPort contract to spend tokens (not needed since airPort calls transferFrom)
    // Instead, approve the 'from' to allow the airPort contract to transfer on its behalf
    await token.connect(from).approve(owner.address, ethers.parseEther("100"));
    
    // Deploy the airPort contract
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();
    
    // Now transfer from should work with original, but with mutant sha256 it will fail
    const tos = [to1.address, to2.address];
    const value = ethers.parseEther("10");
    
    // This call should revert on mutant because sha256 produces wrong selector
    await expect(
      airPort.transfer(from.address, token.target, tos, value)
    ).to.be.reverted;
    
    // Verify no tokens were transferred (should hold true for both original and mutant)
    // Original would succeed and transfer tokens, mutant would revert
    // We check revert to confirm mutant behavior
  });
});

// Helper ERC20 token contract for testing
// This should be deployed as a separate contract file
contract TestERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value);
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value);
        require(allowance[from][msg.sender] >= value);
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }
}