import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m7db7addf test", function () {
  it("should detect off-by-one error when tos and vs have one element", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a simple ERC20 token that the contract can call transferFrom on
    const ERC20Factory = await ethers.getContractFactory("TestERC20");
    const token = await ERC20Factory.deploy();
    await token.waitForDeployment();

    // Mint tokens to owner and approve AirDropContract to transfer
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await token.getAddress(), ethers.parseEther("100"));

    // Deploy AirDropContract
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airdrop = await AirDropFactory.deploy();
    await airdrop.waitForDeployment();

    // Prepare single-element arrays
    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];

    // This should succeed on original, but fail on mutant due to out-of-bounds access
    await expect(
      airdrop.connect(owner).transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});

// Helper ERC20 contract for testing
contract TestERC20 {
    string public name = "Test";
    string public symbol = "TST";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) public {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(allowance[from][msg.sender] >= amount);
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}