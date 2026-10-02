import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant test - kill m69886c07", function () {
  it("should detect mutation where keccak256 is replaced by sha256 in transfer function", async function () {
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve EBU contract to transfer
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(instance.target, mintAmount);

    // Prepare transfer parameters: from=owner, caddress=token, to=[addr1], v=[50]
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("50")];

    // Call transfer on the mutant contract
    const tx = await instance.transfer(owner.address, token.target, recipients, amounts);
    await tx.wait();

    // Check that the transfer actually happened (should fail on mutant)
    const addr1Balance = await token.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(ethers.parseEther("50"));
  });
});