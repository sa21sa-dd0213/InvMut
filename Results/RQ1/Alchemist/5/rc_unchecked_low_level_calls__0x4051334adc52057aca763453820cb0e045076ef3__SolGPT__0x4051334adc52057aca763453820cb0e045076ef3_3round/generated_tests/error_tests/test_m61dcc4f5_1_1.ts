import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m61dcc4f5 test", function () {
  it("should revert when using sha256 instead of keccak256 for function selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Mint tokens to addr1 and approve airdrop contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);
    await token.connect(addr1).approve(await airdrop.getAddress(), mintAmount);

    // Prepare recipients array
    const recipients = [addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Attempt to call transfer - should revert because sha256 produces wrong selector
    await expect(
      airdrop.connect(owner).transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        transferAmount
      )
    ).to.be.reverted;

    // Verify that tokens were NOT transferred (original would have succeeded)
    const addr1Balance = await token.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(mintAmount);

    const addr2Balance = await token.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(0);
  });
});