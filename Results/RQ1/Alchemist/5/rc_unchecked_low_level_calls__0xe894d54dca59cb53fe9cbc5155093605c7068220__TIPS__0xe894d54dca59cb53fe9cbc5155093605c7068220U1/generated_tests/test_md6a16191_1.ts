import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant md6a16191 - empty _tos array", function () {
  it("should revert when _tos array is empty", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing the transferFrom call
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Fund addr1 with some tokens and approve the airDrop contract
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Attempt to call transfer with an empty _tos array - should revert
    await expect(
      instance.transfer(
        addr1.address,
        await token.getAddress(),
        [], // empty _tos array
        ethers.parseEther("1"),
        18
      )
    ).to.be.reverted;
  });
});

// Helper contract for testing (deploy as a simple ERC20)
// Note: In practice you would deploy an actual ERC20, but this shows the structure
contract SimpleERC20 {
  string public name = "Test";
  string public symbol = "TST";
  uint8 public decimals = 18;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  function mint(address to, uint256 amount) external {
    balanceOf[to] += amount;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    return true;
  }

  function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    require(allowance[from][msg.sender] >= amount, "allowance too low");
    require(balanceOf[from] >= amount, "balance too low");
    balanceOf[from] -= amount;
    balanceOf[to] += amount;
    allowance[from][msg.sender] -= amount;
    return true;
  }
}