import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant m2d81db30 (createArtFromFactory msg.value+1)", function () {
  it("should revert when trying to refund more ETH than received", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const nft = await Factory.deploy();
    await nft.waitForDeployment();

    // Deploy a mock factory contract that returns a fixed artCreateFee
    const mockFactoryCode = `
      contract MockFactory {
        uint256 public artCreateFee = 0.1 ether;
        function protocolFeeDestination() external view returns (address) {
          return address(0xdead);
        }
        function artData(uint256) external view returns (uint256, address, uint256, string memory, string memory, address, address, address, uint256, uint256, uint256, uint256, uint256, bool) {
          return (0, address(0), 0, "", "", address(0), address(0), address(0), 0, 0, 0, 0, 0, false);
        }
        function phiRewardsAddress() external view returns (address) {
          return address(0);
        }
        function contractURI(address) external pure returns (string memory) {
          return "";
        }
        function getTokenURI(uint256) external pure returns (string memory) {
          return "";
        }
      }
    `;

    const MockFactory = await ethers.getContractFactory(mockFactoryCode);
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();

    // Deploy a caller contract that can call createArtFromFactory
    const callerCode = `
      contract Caller {
        function callCreateArt(address nft, uint256 artId) external payable returns (uint256) {
          (bool success, bytes memory data) = nft.call{value: msg.value}(
            abi.encodeWithSignature("createArtFromFactory(uint256)", artId)
          );
          require(success, "create failed");
          return abi.decode(data, (uint256));
        }
        
        function initialize(address nft, uint256 credChainId, uint256 credId, string memory verificationType, address protocolFeeDest) external {
          (bool success, ) = nft.call(
            abi.encodeWithSignature("initialize(uint256,uint256,string,address)", 
              credChainId, credId, verificationType, protocolFeeDest)
          );
          require(success, "init failed");
        }
      }
    `;

    const CallerFactory = await ethers.getContractFactory(callerCode);
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();

    // Initialize the NFT through the caller so phiFactoryContract = caller address
    const protocolFeeDest = addr1.address;
    await caller.initialize(
      await nft.getAddress(),
      1,
      1,
      "test",
      protocolFeeDest
    );

    // Set the phiFactoryContract to our mock factory by modifying storage
    // The phiFactoryContract is stored at a specific slot - we need to find it
    // For PhiNFT1155, phiFactoryContract is stored in slot 0 (first state variable after inherited contracts)
    // But let's use a different approach: deploy a contract that can set the storage
    
    // Instead, let's deploy a new mock that also acts as the phiFactory
    const fullMockCode = `
      contract FullMock {
        uint256 public artCreateFee = 1 ether;
        function protocolFeeDestination() external view returns (address) {
          return address(0xdead);
        }
        function artData(uint256) external view returns (uint256, address, uint256, string memory, string memory, address, address, address, uint256, uint256, uint256, uint256, uint256, bool) {
          return (0, address(0), 0, "", "", address(0), address(0), address(0), 0, 0, 0, 0, 0, false);
        }
        function phiRewardsAddress() external view returns (address) {
          return address(0);
        }
        function contractURI(address) external pure returns (string memory) {
          return "";
        }
        function getTokenURI(uint256) external pure returns (string memory) {
          return "";
        }
        
        function initialize(address nft, uint256 credChainId, uint256 credId, string memory verificationType, address protocolFeeDest) external {
          (bool success, ) = nft.call(
            abi.encodeWithSignature("initialize(uint256,uint256,string,address)", 
              credChainId, credId, verificationType, protocolFeeDest)
          );
          require(success, "init failed");
        }
        
        function callCreateArt(address nft, uint256 artId) external payable returns (uint256) {
          (bool success, bytes memory data) = nft.call{value: msg.value}(
            abi.encodeWithSignature("createArtFromFactory(uint256)", artId)
          );
          require(success, "create failed");
          return abi.decode(data, (uint256));
        }
      }
    `;

    const FullMock = await ethers.getContractFactory(fullMockCode);
    const fullMock = await FullMock.deploy();
    await fullMock.waitForDeployment();

    // Deploy fresh NFT
    const nft2 = await Factory.deploy();
    await nft2.waitForDeployment();

    // Initialize through fullMock
    await fullMock.initialize(
      await nft2.getAddress(),
      1,
      1,
      "test",
      protocolFeeDest
    );

    // Now phiFactoryContract on nft2 = address(fullMock)
    // Send some ETH to the NFT contract so it has balance for the refund
    await owner.sendTransaction({
      to: await nft2.getAddress(),
      value: ethers.parseEther("10")
    });

    // Call createArtFromFactory with msg.value = artFee (1 ether)
    // The mutated code tries to send msg.value+1 - artFee = 1 wei
    // Since contract has 10 ETH, it won't revert due to balance, but let's check
    // Actually the mutation is: _msgSender().safeTransferETH(msg.value+1 - artFee)
    // When msg.value = artFee, original sends 0, mutant sends 1 wei
    // This should succeed if contract has enough balance
    
    // But the test expects it to revert. Let's check if the original code would revert
    // with insufficient balance. Let's make the contract have exactly artFee balance
    // so the extra 1 wei would fail
    
    // Deploy another fresh NFT with no initial balance
    const nft3 = await Factory.deploy();
    await nft3.waitForDeployment();
    
    await fullMock.initialize(
      await nft3.getAddress(),
      1,
      1,
      "test",
      protocolFeeDest
    );
    
    // Don't send ETH to nft3, so when it tries to send 1 wei it will revert
    // But wait, it first sends artFee to protocolFeeDestination, which will also fail
    // because contract has no ETH
    
    // Let's send exactly artFee to the contract
    await owner.sendTransaction({
      to: await nft3.getAddress(),
      value: ethers.parseEther("1")  // exactly artFee
    });
    
    // Now call createArtFromFactory with msg.value = 1 ether
    // Original: sends 1 ether to protocolFeeDest, then sends 0 to msg.sender -> works
    // Mutant: sends 1 ether to protocolFeeDest, then tries to send 1 wei -> reverts
    
    const tx = fullMock.callCreateArt(
      await nft3.getAddress(),
      1,
      { value: ethers.parseEther("1") }
    );

    // The mutation should cause a revert due to insufficient balance
    await expect(tx).to.be.reverted;
  });
});