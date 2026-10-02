import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m61dcc4f5 by verifying correct function selector is used", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to addr1 and approve airdrop contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);
    await token.connect(addr1).approve(await airdrop.getAddress(), mintAmount);

    // Create recipients array
    const recipients = [addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Attempt the transfer - this should succeed on original but fail on mutant
    // because mutant uses sha256 instead of keccak256 for function selector
    await expect(
      airdrop.connect(addr1).transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        transferAmount
      )
    ).to.not.be.reverted;

    // Verify the transfer actually happened
    expect(await token.balanceOf(addr2.address)).to.equal(transferAmount);
  });
});