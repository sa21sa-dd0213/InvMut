import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m61dcc4f5 test", function () {
  it("should detect sha256 replacement by reverting on valid ERC20 transferFrom call", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address and approve the airdrop contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(owner.address, mintAmount);
    
    // Deploy the airdrop contract
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Fund 'from' with ETH for gas if needed
    await owner.sendTransaction({
      to: from.address,
      value: ethers.parseEther("1")
    });
    
    // Call transfer from the airdrop contract
    // This should succeed on original (keccak256) but fail on mutant (sha256)
    const recipients = [to.address];
    const transferValue = ethers.parseEther("10");
    
    await expect(
      airdrop.connect(from).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        transferValue
      )
    ).to.be.reverted;
  });
});