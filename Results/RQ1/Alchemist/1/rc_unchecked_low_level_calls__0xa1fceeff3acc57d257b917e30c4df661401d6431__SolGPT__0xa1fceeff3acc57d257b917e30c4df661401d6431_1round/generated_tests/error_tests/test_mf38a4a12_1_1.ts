import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test mf38a4a12", function () {
  it("should return true when transfer is called with valid parameters", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that has transferFrom function
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to owner and approve the AirDropContract to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);

    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("100"), ethers.parseEther("200")];

    // Call transfer and expect it to return true
    const tx = await instance.connect(owner).transfer(await token.getAddress(), tos, vs);
    await tx.wait();

    // Check the return value from the transaction
    const result = await instance.connect(owner).transfer.staticCall(await token.getAddress(), tos, vs);
    expect(result).to.equal(true);
  });
});

// Helper contract for testing
contract TestERC20 {
  string public name = "Test Token";
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
    allowance[from][msg.sender] -= amount;
    balanceOf[from] -= amount;
    balanceOf[to] += amount;
    return true;
  }
}