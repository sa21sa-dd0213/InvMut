import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m61dcc4f5 test", function () {
  it("should kill mutant by verifying transferFrom fails with sha256 selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy the airdrop contract (no constructor args)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Fund addr1 with tokens and approve airdrop contract
    const amount = ethers.parseEther("10");
    await token.transfer(addr1.address, amount);
    await token.connect(addr1).approve(await airdrop.getAddress(), amount);

    // Record balance before
    const balanceBefore = await token.balanceOf(addr2.address);

    // Call transfer from addr1 to addr2 using airdrop contract
    const recipients = [addr2.address];
    await expect(
      airdrop.connect(owner).transfer(addr1.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;

    // Verify no transfer happened
    const balanceAfter = await token.balanceOf(addr2.address);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});

// Simple ERC20 token for testing contract TestToken {
//   string public name = "Test";
//   string public symbol = "TST";
//   uint8 public decimals = 18;
//   uint256 public totalSupply;
//   mapping(address => uint256) public balanceOf;
//   mapping(address => mapping(address => uint256)) public allowance;
//
//   constructor() {
//     totalSupply = ethers.parseEther("1000000");
//     balanceOf[msg.sender] = totalSupply;
//   }
//
//   function transfer(address to, uint256 value) public returns (bool) {
//     require(balanceOf[msg.sender] >= value);
//     balanceOf[msg.sender] -= value;
//     balanceOf[to] += value;
//     return true;
//   }
//
//   function approve(address spender, uint256 value) public returns (bool) {
//     allowance[msg.sender][spender] = value;
//     return true;
//   }
//
//   function transferFrom(address from, address to, uint256 value) public returns (bool) {
//     require(balanceOf[from] >= value);
//     require(allowance[from][msg.sender] >= value);
//     balanceOf[from] -= value;
//     balanceOf[to] += value;
//     allowance[from][msg.sender] -= value;
//     return true;
//   }
// }