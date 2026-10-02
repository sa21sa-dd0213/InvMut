import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m654f3dec", function () {
  it("should kill mutant by expecting success when transferFrom succeeds", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy EBU contract (no constructor args needed)
    const EBUFactory = await ethers.getContractFactory("EBU");
    const ebu = await EBUFactory.deploy();
    await ebu.waitForDeployment();

    // Mint tokens to 'from' and approve EBU to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await ebu.getAddress(), mintAmount);

    // Setup transfer parameters
    const recipients = [to.address];
    const amounts = [ethers.parseEther("10")];

    // The original would succeed; the mutant always reverts
    // Calling from any address since no access control
    await expect(
      ebu.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        amounts
      )
    ).to.not.be.reverted;
  });
});