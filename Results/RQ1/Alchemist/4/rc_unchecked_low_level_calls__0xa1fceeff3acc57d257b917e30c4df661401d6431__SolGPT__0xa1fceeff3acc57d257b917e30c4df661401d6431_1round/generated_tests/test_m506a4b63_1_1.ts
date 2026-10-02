import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection test", function () {
  it("should detect mutant that changes loop condition from < to >", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing transfers
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Mint tokens to owner and approve the contract to transferFrom
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare arrays for airdrop
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

    // Execute transfer function
    const tx = await instance.connect(owner).transfer(
      await token.getAddress(),
      recipients,
      amounts
    );
    await tx.wait();

    // Verify that tokens were transferred (original behavior)
    // If mutant is present, loop never executes and no tokens move
    const balance1 = await token.balanceOf(addr1.address);
    const balance2 = await token.balanceOf(addr2.address);

    // Both recipients should have received tokens in the original
    expect(balance1).to.equal(ethers.parseEther("10"));
    expect(balance2).to.equal(ethers.parseEther("20"));

    // The mutant would leave balances at 0, causing this assertion to fail
  });
});