import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - sha256 vs keccak256", function () {
  it("should detect the mutant by verifying that transferFrom function selector is used correctly", async function () {
    // Deploy a simple ERC20-like contract that tracks transferFrom calls
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a minimal contract that will be the target of the airdrop
    const TargetFactory = await ethers.getContractFactory(
      "contracts/test/SimpleERC20.sol:SimpleERC20"
    );
    const token = await TargetFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to the owner so they can transferFrom
    await token.mint(owner.address, ethers.parseEther("1000"));
    
    // Approve the AirDropContract to transfer tokens on behalf of owner
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airdrop = await AirDropFactory.deploy();
    await airdrop.waitForDeployment();
    
    await token.approve(await airdrop.getAddress(), ethers.parseEther("100"));
    
    // Setup recipients and amounts
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];
    
    // Call the transfer function
    const tx = await airdrop.transfer(
      await token.getAddress(),
      recipients,
      amounts
    );
    await tx.wait();
    
    // Verify that tokens were actually transferred (this would fail with sha256 mutant)
    expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
    expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("20"));
    
    // Verify owner's balance decreased correctly
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("970"));
  });
});