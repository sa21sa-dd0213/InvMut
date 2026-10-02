import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - kill md7d40a34", function () {
  it("should succeed on original but fail on mutant when calling airDrop with zero balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Bank contract that supports "Nu Token"
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Call airDrop from addr1, which has zero tokenBalance and uses Bank address as msg.sender
    // The supportsToken modifier requires msg.sender to be a Bank that returns correct keccak256
    // So we need to impersonate the Bank contract as the caller
    const bankAsSigner = await ethers.getImpersonatedSigner(await bank.getAddress());
    
    // Fund the impersonated signer with some ETH for gas
    await owner.sendTransaction({
      to: await bankAsSigner.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // The bank's tokenBalance is 0, so hasNoBalance passes
    // Original: require((0 + 20) >= 0) passes
    // Mutant: require((0 + 20) == 0) fails (20 != 0)
    await expect(
      instance.connect(bankAsSigner).airDrop()
    ).to.be.reverted;
  });
});