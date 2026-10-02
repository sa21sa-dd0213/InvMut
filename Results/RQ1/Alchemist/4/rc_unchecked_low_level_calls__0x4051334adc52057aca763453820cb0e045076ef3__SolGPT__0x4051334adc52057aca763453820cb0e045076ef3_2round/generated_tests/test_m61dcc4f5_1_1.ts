import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m61dcc4f5 test", function () {
  it("should kill the mutant by proving sha256 produces wrong function selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund owner with tokens and approve airdrop contract to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(owner.address, ethers.parseEther("100"));

    // Deploy the airdrop contract (no constructor arguments needed)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Get initial balance of addr2
    const initialBalance = await token.balanceOf(addr2.address);

    // Call transfer on the airdrop contract - should use transferFrom to send tokens
    const recipients = [addr2.address];
    const tx = await airdrop.transfer(
      addr1.address,
      token.target,
      recipients,
      ethers.parseEther("10")
    );
    await tx.wait();

    // Check that tokens were transferred (this will fail on mutant because sha256 gives wrong selector)
    const finalBalance = await token.balanceOf(addr2.address);
    expect(finalBalance).to.equal(initialBalance + ethers.parseEther("10"));
  });
});