import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m4056f5f9 test", function () {
  it("should detect keccak256 replaced by sha256 in transfer function selector calculation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like token to act as the caddress target
    // This token will help us verify if transferFrom was actually called correctly
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Get the deployed addresses
    const ebuAddress = await instance.getAddress();
    const tokenAddress = await token.getAddress();
    
    // The EBU contract has a hardcoded from address and caddress
    // We need to verify the actual values from the deployed contract
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();
    
    // Mint tokens to the from address so transferFrom can work
    const mintAmount = ethers.parseEther("100");
    await token.mint(fromAddress, mintAmount);
    
    // Approve the EBU contract to spend tokens from the from address
    // Note: In the actual test scenario, the from address is hardcoded
    // We need to impersonate or use the actual from address to approve
    await token.connect(owner).approve(ebuAddress, ethers.parseEther("100"));
    
    // Prepare test data
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 1e18 in the contract)
    
    // Call transfer function from the authorized address (hardcoded from)
    // The contract requires msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to use impersonation or the actual signer for that address
    // For testing, we'll use hardhat's ability to impersonate accounts
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"],
    });
    
    const impersonatedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Send some ETH to the impersonated account for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1"),
    });
    
    // Get balance before
    const balanceBefore = await token.balanceOf(addr1.address);
    
    // Execute the transfer
    const tx = await instance.connect(impersonatedSigner).transfer(recipients, amounts);
    await tx.wait();
    
    // Get balance after
    const balanceAfter = await token.balanceOf(addr1.address);
    
    // For the original contract (using keccak256), the balance should increase
    // For the mutant (using sha256), the balance should remain the same because
    // the wrong function selector is used
    expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("1"));
  });
});