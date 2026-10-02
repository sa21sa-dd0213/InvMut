import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m4cc3d57f - loop condition changed from < to >", function () {
  it("should detect mutant by verifying transfers are executed when _tos is non-empty", async function () {
    const [owner, from, recipient1, recipient2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Create a simple ERC20-like token to test transferFrom
    // Since EBU expects a token contract at caddress, deploy a minimal ERC20
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address and approve EBU contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    // Prepare arrays for the transfer call
    const recipients = [recipient1.address, recipient2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

    // Call transfer on EBU
    await instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      amounts
    );

    // Verify that the tokens were actually transferred (original behavior)
    // If the mutant is present (i > _tos.length), no transfers happen
    const balanceRecipient1 = await token.balanceOf(recipient1.address);
    const balanceRecipient2 = await token.balanceOf(recipient2.address);

    expect(balanceRecipient1).to.equal(ethers.parseEther("10"));
    expect(balanceRecipient2).to.equal(ethers.parseEther("20"));
  });
});