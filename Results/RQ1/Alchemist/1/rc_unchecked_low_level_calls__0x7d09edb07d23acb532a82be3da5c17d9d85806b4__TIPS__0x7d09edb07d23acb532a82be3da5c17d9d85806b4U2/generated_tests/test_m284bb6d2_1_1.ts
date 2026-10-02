import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant kill test", function () {
  it("should kill mutant m284bb6d2 by verifying return value of transferAnyERC20Token", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token for testing
    const SimpleTokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await SimpleTokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint some tokens to the contract for testing transfer
    const mintAmount = ethers.parseEther("100");
    await token.mint(await instance.getAddress(), mintAmount);
    
    // Call transferAnyERC20Token and verify it returns true
    const result = await instance.transferAnyERC20Token(
      await token.getAddress(),
      owner.address,
      ethers.parseEther("10")
    );
    
    // The original returns the success boolean (true), mutant returns false
    expect(result).to.be.true;
  });
});

// Minimal ERC20 implementation for testing
contract SimpleERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) public {
        balanceOf[to] += amount;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}