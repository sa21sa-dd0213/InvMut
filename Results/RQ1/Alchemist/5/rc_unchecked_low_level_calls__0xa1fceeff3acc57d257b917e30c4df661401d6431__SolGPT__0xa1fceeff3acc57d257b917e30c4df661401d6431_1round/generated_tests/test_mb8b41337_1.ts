import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - mb8b41337", function () {
  it("should revert when tos array is empty (original requires tos.length > 0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that will be used as the contract_address
    const ERC20Factory = await ethers.getContractFactory("TestERC20");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy AirDropContract
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Fund owner with tokens and approve the AirDropContract to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await airDrop.getAddress(), mintAmount);
    
    // Prepare empty tos array and non-empty vs array (should revert in original)
    const emptyTos: string[] = [];
    const vs = [ethers.parseEther("10")];
    
    // Call transfer with empty tos array - should revert in original due to require(tos.length > 0)
    await expect(
      airDrop.connect(owner).transfer(await token.getAddress(), emptyTos, vs)
    ).to.be.reverted;
  });
});

// Helper ERC20 contract for testing (deployable with Hardhat)
contract TestERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        return true;
    }
}