import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m72961402 test", function () {
  it("should detect when caddress is set to address(0) instead of the correct contract address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the original EBU contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the original caddress value
    const originalCaddress = await instance.caddress();
    
    // Deploy a mock token contract to simulate the transferFrom target
    // Note: Since EBU doesn't have a constructor, we can deploy it directly
    // For the test, we need a contract at the original caddress to verify calls
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();
    
    // Deploy the mutant version by replacing caddress with address(0)
    const MutantFactory = await ethers.getContractFactory("EBU", {
      libraries: {}
    });
    
    // We need to manually set caddress to address(0) in the mutant
    // Since we can't modify bytecode easily, we'll test the behavior
    // by checking that the original contract works and the mutant would fail
    
    // Test the original contract behavior
    // First, we need to set up the mock token to accept transferFrom
    // Give allowance to the EBU contract from the owner
    await mockToken.approve(instance.target, ethers.parseEther("100"));
    
    // Prepare test parameters
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token
    
    // Call transfer on original - this should succeed if caddress is correct
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    await tx.wait();
    
    // Now test that the mutant would fail by checking caddress value
    // If caddress is address(0), the call would silently do nothing
    expect(originalCaddress).to.not.equal(ethers.ZeroAddress);
    
    // Verify that the call was made to the correct contract
    // by checking if the mock token received the transfer
    const balance = await mockToken.balanceOf(addr1.address);
    expect(balance).to.equal(ethers.parseEther("1"));
    
    // If we deployed a mutant with caddress = address(0), the transfer would not happen
    // So we verify the original behavior passes but the mutant would fail
  });
});

// Helper contract to simulate the token that EBU calls transferFrom on
contract MockToken {
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public balanceOf;
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(allowance[from][msg.sender] >= value);
        allowance[from][msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }
}