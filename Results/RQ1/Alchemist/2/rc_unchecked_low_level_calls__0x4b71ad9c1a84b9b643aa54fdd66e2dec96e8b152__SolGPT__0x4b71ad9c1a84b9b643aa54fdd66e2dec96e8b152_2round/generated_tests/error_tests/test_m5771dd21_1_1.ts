import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m5771dd21 test", function () {
  it("should kill mutant by verifying correct function selector computation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20-like token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy the airPort contract (no constructor arguments needed)
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();

    // Fund addr1 with tokens and approve airPort contract to spend them
    const amount = ethers.parseEther("10");
    await token.transfer(addr1.address, amount);
    await token.connect(addr1).approve(airPort.target, amount);

    // Create recipient array
    const recipients = [addr2.address];

    // Call transfer - if mutant is present, it will compute wrong selector and revert
    await expect(
      airPort.connect(addr1).transfer(
        addr1.address,
        token.target,
        recipients,
        amount
      )
    ).to.not.be.reverted;
  });
});

// Helper contract to test with (deploy alongside)
// This should be in a separate file or defined here for completeness
// For the test to work, you need an ERC20 contract deployed
// that implements transferFrom correctly
contract TestToken {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;

    constructor() {
        balances[msg.sender] = ethers.parseEther("1000");
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount);
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balances[from] >= amount);
        require(allowances[from][msg.sender] >= amount);
        balances[from] -= amount;
        balances[to] += amount;
        allowances[from][msg.sender] -= amount;
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }
}