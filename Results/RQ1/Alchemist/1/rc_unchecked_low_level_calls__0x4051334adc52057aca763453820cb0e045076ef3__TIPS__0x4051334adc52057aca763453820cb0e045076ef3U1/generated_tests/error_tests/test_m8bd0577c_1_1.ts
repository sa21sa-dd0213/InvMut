import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c test", function () {
    it("should detect loop condition change from < to > by verifying transfers actually occur", async function () {
        const [owner, recipient1, recipient2] = await ethers.getSigners();
        
        // Deploy a simple ERC20 token for testing transfers
        const TokenFactory = await ethers.getContractFactory("TestERC20");
        const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
        await token.waitForDeployment();
        
        // Deploy the airdrop contract
        const AirdropFactory = await ethers.getContractFactory("airdrop");
        const airdrop = await AirdropFactory.deploy();
        await airdrop.waitForDeployment();
        
        // Fund the owner with tokens and approve airdrop contract
        await token.transfer(owner.address, ethers.parseEther("100"));
        await token.connect(owner).approve(await airdrop.getAddress(), ethers.parseEther("100"));
        
        // Prepare recipients array
        const recipients = [recipient1.address, recipient2.address];
        const transferAmount = ethers.parseEther("10");
        
        // Record balances before transfer
        const balance1Before = await token.balanceOf(recipient1.address);
        const balance2Before = await token.balanceOf(recipient2.address);
        
        // Call transfer on airdrop contract
        const tx = await airdrop.connect(owner).transfer(
            owner.address,
            await token.getAddress(),
            recipients,
            transferAmount
        );
        await tx.wait();
        
        // Check balances after - if mutant is active (i > _tos.length), loop never executes
        const balance1After = await token.balanceOf(recipient1.address);
        const balance2After = await token.balanceOf(recipient2.address);
        
        // Assert that transfers actually happened (would fail on mutant)
        expect(balance1After - balance1Before).to.equal(transferAmount);
        expect(balance2After - balance2Before).to.equal(transferAmount);
    });
});

// Helper ERC20 contract for testing
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
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
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
}