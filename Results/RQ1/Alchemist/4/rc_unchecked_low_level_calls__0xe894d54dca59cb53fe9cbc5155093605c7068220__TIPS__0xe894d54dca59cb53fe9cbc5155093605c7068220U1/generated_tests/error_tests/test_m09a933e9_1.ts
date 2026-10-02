import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airDrop mutant detection test", function () {
  it("should detect sha256 mutation by verifying transferFrom selector mismatch", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like contract to act as the token
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Mint tokens to the 'from' address
    await token.mint(from.address, ethers.parseEther("100"));
    
    // Approve the airDrop contract to spend tokens
    await token.connect(from).approve(owner.address, ethers.parseEther("50"));
    
    // Deploy the airDrop contract (mutant version)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Record balance before transfer
    const balanceBefore = await token.balanceOf(to.address);
    
    // Attempt the transfer via airDrop - this will fail in mutant because wrong selector
    const recipients = [to.address];
    const amount = 10;
    const decimals = 18;
    
    // The mutant will call a non-existent function, so the call will succeed (return true)
    // but no actual transfer will occur
    await airDrop.transfer(from.address, token.target, recipients, amount, decimals);
    
    // Check balance after - should be unchanged in mutant, increased in original
    const balanceAfter = await token.balanceOf(to.address);
    
    // The test passes on original (balance increases) but fails on mutant (balance unchanged)
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});

// Helper contract to have a simple token with transferFrom
contract SimpleToken {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    
    function mint(address to, uint256 amount) external {
        balances[to] += amount;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowances[from][msg.sender] >= amount);
        allowances[from][msg.sender] -= amount;
        balances[from] -= amount;
        balances[to] += amount;
        return true;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}